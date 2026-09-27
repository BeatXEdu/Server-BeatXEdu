  // ====================================================
  // NHẬN DIỆN THIẾT BỊ
  // ====================================================

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {

    console.log(
      "BeatXEdu: Đang chạy trên iOS"
    );

  } else if (/Android/i.test(ua)) {

    console.log(
      "BeatXEdu: Đang chạy trên Android"
    );

  } else if (/Windows/i.test(ua)) {

    console.log(
      "BeatXEdu: Đang chạy trên Windows"
    );

  } else if (/Linux/i.test(ua)) {

    console.log(
      "BeatXEdu: Đang chạy trên Linux"
    );

  } else if (/Lubuntu/i.test(ua)) {

    console.log(
      "BeatXEdu: Đang chạy trên Lubuntu"
    )
  }
   else {

    console.log(
      "BeatXEdu: Thiết bị không xác định"
    );

  }

