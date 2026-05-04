from __future__ import annotations

import base64
import io
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
from PIL import Image

app = FastAPI()
logger = logging.getLogger("lcr-ocr")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
JSON_DIR = DATA_DIR / "json"
IMAGE_DIR = DATA_DIR / "images"

for folder in (UPLOAD_DIR, JSON_DIR, IMAGE_DIR):
    folder.mkdir(parents=True, exist_ok=True)

ocr = PaddleOCR(
    ocr_version="PP-OCRv5",
    device="gpu:0",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)


def pil_to_base64(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def to_plain_python(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): to_plain_python(val) for key, val in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_plain_python(item) for item in value]
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    return value


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", filename.strip())
    return cleaned or "upload.png"


def to_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(number):
        return None
    return number


def read_result_json(result: Any) -> dict[str, Any]:
    raw = getattr(result, "json", {})
    if callable(raw):
        raw = raw()
    plain = to_plain_python(raw)
    if isinstance(plain, dict):
        return plain
    return {"raw": plain}


def build_lines(raw_json: dict[str, Any]) -> tuple[list[dict[str, Any]], list[float]]:
    data = raw_json.get("res", raw_json)
    if not isinstance(data, dict):
        return [], []

    texts = data.get("rec_texts", [])
    scores = data.get("rec_scores", [])
    boxes = data.get("rec_boxes", [])
    dt_scores = data.get("dt_scores", [])
    dt_polys = data.get("dt_polys", [])

    if hasattr(boxes, "tolist"):
        boxes = boxes.tolist()
    if hasattr(dt_polys, "tolist"):
        dt_polys = dt_polys.tolist()

    lines: list[dict[str, Any]] = []
    numeric_scores: list[float] = []

    if not isinstance(texts, list):
        return [], []

    for index, text in enumerate(texts):
        score = to_float(scores[index]) if isinstance(scores, list) and index < len(scores) else None
        dt_score = to_float(dt_scores[index]) if isinstance(dt_scores, list) and index < len(dt_scores) else None
        box: Any = boxes[index] if isinstance(boxes, list) and index < len(boxes) else None
        if box is None and isinstance(dt_polys, list) and index < len(dt_polys):
            box = dt_polys[index]
        line = {
            "text": str(text),
            "score": score,
            "dt_score": dt_score,
            "box": to_plain_python(box),
        }
        lines.append(line)
        if score is not None:
            numeric_scores.append(score)

    return lines, numeric_scores


def save_result_json(result: Any, raw_json: dict[str, Any], target_path: Path) -> Path:
    if hasattr(result, "save_to_json"):
        try:
            result.save_to_json(str(target_path))
        except Exception as error:
            logger.warning("save_to_json failed for %s: %s", target_path, error)

    target_path.write_text(
        json.dumps(raw_json, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return target_path


def to_pil_image(image_value: Any) -> Image.Image | None:
    if isinstance(image_value, Image.Image):
        return image_value
    if isinstance(image_value, np.ndarray):
        if image_value.dtype != np.uint8:
            clipped = np.clip(image_value, 0, 255).astype(np.uint8)
            return Image.fromarray(clipped)
        return Image.fromarray(image_value)
    return None


def save_result_images(
    result: Any, request_id: str, result_index: int
) -> tuple[dict[str, str], list[str], str | None]:
    before_files = {
        path.resolve(): path.stat().st_mtime for path in IMAGE_DIR.glob("*") if path.is_file()
    }
    if hasattr(result, "save_to_img"):
        try:
            result.save_to_img(str(IMAGE_DIR))
        except Exception as error:
            logger.warning("save_to_img failed for request %s result %s: %s", request_id, result_index, error)
    after_files = {
        path.resolve(): path.stat().st_mtime for path in IMAGE_DIR.glob("*") if path.is_file()
    }

    result_images: dict[str, str] = {}
    saved_image_paths: list[str] = []
    for path, mtime in sorted(after_files.items()):
        previous_mtime = before_files.get(path)
        if previous_mtime is None or mtime != previous_mtime:
            saved_image_paths.append(str(path))
    saved_ocr_image_path: str | None = None
    images = getattr(result, "img", None)
    if not isinstance(images, dict):
        unique_paths = list(dict.fromkeys(saved_image_paths))
        return result_images, unique_paths, saved_ocr_image_path

    for key, value in images.items():
        pil_image = to_pil_image(value)
        if pil_image is None:
            continue

        filename = f"{request_id}_{result_index}_{key}.png"
        target_path = IMAGE_DIR / filename
        try:
            pil_image.save(target_path)
            result_images[key] = pil_to_base64(pil_image)
            saved_image_paths.append(str(target_path))
        except Exception as error:
            logger.warning(
                "save image failed for request %s result %s key %s: %s",
                request_id,
                result_index,
                key,
                error,
            )
            continue

        if key == "ocr_res_img":
            saved_ocr_image_path = str(target_path)

    unique_paths = list(dict.fromkeys(saved_image_paths))
    return result_images, unique_paths, saved_ocr_image_path


def average(numbers: list[float]) -> float | None:
    if not numbers:
        return None
    return float(sum(numbers) / len(numbers))


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "LCR OCR service running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)):
    image_bytes = await file.read()
    if not image_bytes:
        return JSONResponse({"message": "上傳檔案為空。"}, status_code=400)

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return JSONResponse({"message": "無法讀取圖片檔案。"}, status_code=400)

    request_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
    safe_name = sanitize_filename(file.filename or "upload.png")
    upload_path = UPLOAD_DIR / f"{request_id}_{safe_name}"
    upload_path.write_bytes(image_bytes)

    img_array = np.array(image)

    try:
        prediction_results = ocr.predict(img_array)
    except Exception as error:
        return JSONResponse(
            {"message": "OCR 執行失敗。", "details": str(error)},
            status_code=500,
        )

    response_results: list[dict[str, Any]] = []
    merged_lines: list[dict[str, Any]] = []
    merged_scores: list[float] = []
    saved_json_paths: list[str] = []
    saved_image_paths: list[str] = []
    merged_images: dict[str, str] = {}

    for index, result in enumerate(prediction_results):
        raw_json = read_result_json(result)
        lines, numeric_scores = build_lines(raw_json)
        result_average = average(numeric_scores)

        json_path = JSON_DIR / f"{request_id}_{index}.json"
        saved_json_path = save_result_json(result, raw_json, json_path)
        saved_json_paths.append(str(saved_json_path))

        images, result_saved_image_paths, saved_image_path = save_result_images(result, request_id, index)
        saved_image_paths.extend(result_saved_image_paths)

        for image_key, image_base64 in images.items():
            if image_key not in merged_images:
                merged_images[image_key] = image_base64

        response_results.append(
            {
                "texts": [line["text"] for line in lines],
                "average_score": result_average,
                "lines": lines,
                "raw": raw_json,
                "images": images,
                "saved_json_path": str(saved_json_path),
                "saved_image_path": saved_image_path,
                "saved_image_paths": result_saved_image_paths,
            }
        )

        merged_lines.extend(lines)
        merged_scores.extend(numeric_scores)

    return JSONResponse(
        {
            "filename": file.filename,
            "saved_upload_path": str(upload_path),
            "result_count": len(response_results),
            "average_score": average(merged_scores),
            "lines": merged_lines,
            "images": merged_images,
            "saved_json_paths": saved_json_paths,
            "saved_image_paths": list(dict.fromkeys(saved_image_paths)),
            "results": response_results,
        }
    )
