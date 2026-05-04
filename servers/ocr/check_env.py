import paddleocr
print(f"PaddleOCR版本: {paddleocr.__version__}")

import paddle
print(f"Paddle版本: {paddle.__version__}")
print(f"GPU可用: {paddle.is_compiled_with_cuda()}")
print(f"GPU数量: {paddle.device.cuda.device_count()}")

try:
    import transformers
    print(f"Transformers版本: {transformers.__version__}")
except ImportError:
    print("Transformers 未安裝")