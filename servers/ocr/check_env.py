import paddle
import paddleocr

is_cpu_build = not paddle.is_compiled_with_cuda()

print(f"PaddleOCR 版本: {paddleocr.__version__}")
print(f"PaddlePaddle 版本: {paddle.__version__}")
print(f"目前裝置: {paddle.device.get_device()}")
print(f"純 CPU 套件: {is_cpu_build}")

if not is_cpu_build:
    raise SystemExit("偵測到非 CPU 版 PaddlePaddle，請依部署文件重建 .venv。")
