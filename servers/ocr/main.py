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
OCR_DIR = DATA_DIR / "ocr"

for folder in (UPLOAD_DIR, JSON_DIR, IMAGE_DIR, OCR_DIR):
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


def sanitize_name_component(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return "ocr_upload"

    chars: list[str] = []
    for char in normalized:
        if char.isspace():
            chars.append("_")
            continue
        if char.isalnum() or char in {"_", "-"}:
            chars.append(char)
        else:
            chars.append("_")

    cleaned = "".join(chars)
    cleaned = re.sub(r"_+", "_", cleaned)
    cleaned = cleaned.strip("_-")
    return cleaned or "ocr_upload"


def sanitize_extension(filename: str) -> str:
    suffix = Path(filename).suffix.strip()
    if re.fullmatch(r"\.[a-zA-Z0-9]+", suffix):
        return suffix.lower()
    return ".png"


def build_file_identity(
    original_filename: str | None,
    uploaded_at: datetime,
) -> tuple[str, str, str, str, str]:
    fallback_filename = "upload.png"
    source_filename = (original_filename or fallback_filename).strip() or fallback_filename
    original_base_name = sanitize_name_component(Path(source_filename).stem)
    extension = sanitize_extension(source_filename)

    timestamp = uploaded_at.strftime("%Y%m%d_%H%M%S")
    date_only = uploaded_at.strftime("%Y%m%d")
    short_id = uuid4().hex[:6]
    file_key = f"{timestamp}_{original_base_name}_{short_id}"
    dataset_name_suggestion = f"{date_only}_{original_base_name}"
    return source_filename, original_base_name, extension, file_key, dataset_name_suggestion


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
    result: Any,
    output_dir: Path,
    result_index: int,
    total_results: int,
) -> tuple[dict[str, str], list[str], str | None, str | None]:
    result_images: dict[str, str] = {}
    saved_image_paths: list[str] = []
    saved_ocr_image_path: str | None = None
    saved_normalized_image_path: str | None = None
    images = getattr(result, "img", None)
    if not isinstance(images, dict):
        return result_images, saved_image_paths, saved_ocr_image_path, saved_normalized_image_path

    for key, value in images.items():
        pil_image = to_pil_image(value)
        if pil_image is None:
            continue

        safe_key = re.sub(r"[^a-zA-Z0-9_-]", "_", str(key).strip()) or "img"
        target_path: Path | None = None
        if safe_key == "ocr_res_img":
            filename = "ocr.png" if total_results == 1 else f"ocr_{result_index}.png"
            target_path = output_dir / filename
        elif safe_key in {
            "normalized_img",
            "preprocessed_img",
            "input_img",
            "input_image",
            "origin_img",
            "origin_image",
            "original_img",
            "original_image",
            "src_img",
        } and saved_normalized_image_path is None:
            filename = "normalized.png" if total_results == 1 else f"normalized_{result_index}.png"
            target_path = output_dir / filename

        if target_path is None:
            result_images[key] = pil_to_base64(pil_image)
            continue

        try:
            pil_image.save(target_path)
            result_images[key] = pil_to_base64(pil_image)
            saved_image_paths.append(str(target_path))
        except Exception as error:
            logger.warning(
                "save image failed for output %s result %s key %s: %s",
                output_dir,
                result_index,
                key,
                error,
            )
            continue

        if safe_key == "ocr_res_img":
            saved_ocr_image_path = str(target_path)
        elif saved_normalized_image_path is None:
            saved_normalized_image_path = str(target_path)

    return result_images, saved_image_paths, saved_ocr_image_path, saved_normalized_image_path


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

    uploaded_at = datetime.now()
    original_filename, original_base_name, original_extension, file_key, dataset_name_suggestion = build_file_identity(
        file.filename,
        uploaded_at,
    )
    run_dir = OCR_DIR / file_key
    run_dir.mkdir(parents=True, exist_ok=True)
    upload_path = run_dir / f"original{original_extension}"
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
    primary_raw_json_path: str | None = None
    primary_marked_image_path: str | None = None
    primary_normalized_image_path: str | None = None
    total_results = len(prediction_results)

    for index, result in enumerate(prediction_results):
        raw_json = read_result_json(result)
        lines, numeric_scores = build_lines(raw_json)
        result_average = average(numeric_scores)

        json_filename = "result.json" if total_results == 1 else f"result_{index}.json"
        json_path = run_dir / json_filename
        saved_json_path = save_result_json(result, raw_json, json_path)
        saved_json_paths.append(str(saved_json_path))
        if primary_raw_json_path is None:
            primary_raw_json_path = str(saved_json_path)

        images, result_saved_image_paths, saved_image_path, normalized_image_path = save_result_images(
            result,
            run_dir,
            index,
            total_results,
        )
        saved_image_paths.extend(result_saved_image_paths)
        if primary_marked_image_path is None and saved_image_path:
            primary_marked_image_path = saved_image_path
        if primary_normalized_image_path is None and normalized_image_path:
            primary_normalized_image_path = normalized_image_path

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
            "ocrMetadata": {
                "datasetNameSuggestion": dataset_name_suggestion,
                "originalFilename": original_filename,
                "originalBaseName": original_base_name,
                "uploadTimestamp": uploaded_at.isoformat(),
                "fileKey": file_key,
                "folderPath": str(run_dir),
                "originalImagePath": str(upload_path),
                "normalizedImagePath": primary_normalized_image_path,
                "markedImagePath": primary_marked_image_path,
                "rawJsonPath": primary_raw_json_path,
                "wasConverted": False,
                "originalMimeType": file.content_type,
                "normalizedMimeType": "image/png" if primary_normalized_image_path else None,
            },
        }
    )
