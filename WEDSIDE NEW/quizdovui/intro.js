/* ==========================================================================
   INTRO SPLASH — điều phối trình tự: ghép H2O -> hiện logo -> liếc mắt
   xuống logo -> nhìn thẳng giữa màn hình -> chuyển vào index.html
   ========================================================================== */

(() => {
  "use strict";

  const stage = document.getElementById("intro-stage");
  const molecule = document.getElementById("molecule");
  const logo = document.getElementById("intro-logo");
  const btnSkip = document.getElementById("btn-skip");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const timers = [];
  function at(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }
  function clearAllTimers() {
    timers.forEach(clearTimeout);
  }

  function goToApp() {
    clearAllTimers();
    window.location.href = "home.html";
  }

  btnSkip.addEventListener("click", goToApp);

  if (prefersReducedMotion) {
    // Không dùng chuyển động: hiện trạng thái cuối cùng ngay và chuyển trang sớm.
    molecule.classList.add("settle", "look-center");
    logo.classList.add("show");
    at(900, goToApp);
    return;
  }

  /* Mốc thời gian khớp với animation-duration/delay trong intro.css:
     H, O trượt vào: 0 -> 750ms
     Số 2 rơi xuống: 700ms -> 1250ms                                   */
  at(1300, () => molecule.classList.add("settle"));
  at(1350, () => logo.classList.add("show"));

  // 3 nhân vật liếc mắt xuống logo, rồi nhìn thẳng ra giữa màn hình
  at(2050, () => molecule.classList.add("look-down"));
  at(2600, () => {
    molecule.classList.remove("look-down");
    molecule.classList.add("look-center");
  });

  // Mờ dần toàn bộ splash rồi chuyển sang trang chính
  at(3400, () => stage.classList.add("fade-out"));
  at(4000, goToApp);
})();
