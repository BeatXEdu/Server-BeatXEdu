# Benchmark KK

**PC Performance Test — By BeatXEdu**

Web prototype để benchmark CPU, GPU, RAM, SSD và Wi‑Fi/Network, với thang điểm nội bộ 0–100.

## Chạy

Không nên mở `index.html` bằng `file://` nếu muốn test đầy đủ.

Nếu có Node.js:

```bash
node server.js
```

Mở:

```text
http://localhost:8080
```

Hoặc deploy toàn bộ thư mục lên hosting HTTPS.

## Cấu trúc

```text
benchmark-kk/
├── index.html
├── style.css
├── app.js
├── server.js
├── README.md
├── assets/
│   ├── logo.svg
│   └── ping.txt
└── workers/
    └── cpu-worker.js
```

## Bài test

- CPU: Web Worker, phép toán integer.
- GPU: WebGL rendering loop và FPS.
- RAM: TypedArray throughput trong JavaScript.
- SSD: IndexedDB read/write throughput. Đây là storage sandbox của trình duyệt, không phải benchmark raw NVMe/SATA.
- Wi‑Fi/Network: request tới server đang phục vụ trang. Bản web thuần không thể đo card Wi‑Fi vật lý một cách trực tiếp.
- Stability: vòng lặp nhẹ để hoàn thiện phiên benchmark.

## Quan trọng

Điểm `/100` là **Benchmark KK Score**, không phải điểm chuẩn tuyệt đối của CPU/GPU. Kết quả phụ thuộc browser, OS, driver, tab nền và tải hệ thống.

Bản v1 dùng API trình duyệt nên không thể đọc chính xác nhiệt độ CPU/GPU, tên phần cứng trong mọi trình duyệt, hay tốc độ SSD vật lý.

Có nút DỪNG TEST. Không nên chạy benchmark stress kéo dài trên máy đang quá nóng.

## Trọng số

CPU 30% · GPU 25% · RAM 15% · SSD 15% · Wi‑Fi 15%.

## Roadmap

### Web v1
- [x] Splash "By BeatXEdu"
- [x] 15 phút
- [x] CPU/GPU/RAM/SSD/Network
- [x] Score /100
- [x] JSON export
- [x] Report

### Web v2
- WebGPU
- biểu đồ FPS/throughput theo thời gian
- benchmark server riêng cho download/upload
- lịch sử kết quả
- so sánh nhiều lần test

### App
Có thể chuyển benchmark engine sang native để lấy hardware telemetry chính xác hơn:
- CPU utilization/frequency
- RAM usage
- GPU utilization
- nhiệt độ khi OS cho phép
- disk sequential/random I/O
- network adapter information
