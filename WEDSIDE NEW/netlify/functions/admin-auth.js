exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        success: false,
        error: "Method Not Allowed"
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      layer,
      username,
      password
    } = body;

    /*
     * Kiểm tra dữ liệu gửi lên
     */
    if (!layer || !username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Thiếu thông tin đăng nhập."
        })
      };
    }

    /*
     * 3 tài khoản.
     *
     * Tên tài khoản và mật khẩu thật nằm trong
     * Netlify Environment Variables.
     *
     * Cả 3 tài khoản đều được phép đi qua
     * cả 3 lớp.
     */
    const accounts = [
      {
        username: process.env.OWNER,
        password: process.env.PASS_OWNER,
        role: "OWNER"
      },
      {
        username: process.env.ADMIN1,
        password: process.env.PASS_ADMIN,
        role: "ADMIN"
      },
      {
        username: process.env.KHACH,
        password: process.env.PASS_KHACH,
        role: "MODERATOR"
      }
    ];

    /*
     * Tìm tài khoản hợp lệ.
     *
     * Không dùng layer để chọn tài khoản.
     */
    const account = accounts.find(
      acc =>
        acc.username === username &&
        acc.password === password
    );

    /*
     * Không tìm thấy tài khoản
     */
    if (!account) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: "Tài khoản hoặc mật khẩu không đúng."
        })
      };
    }

    /*
     * Layer chỉ cho biết người dùng đang
     * xác thực lớp nào.
     *
     * Không quyết định tài khoản.
     */
    const currentLayer = Number(layer);

    if (![1, 2, 3].includes(currentLayer)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Lớp bảo mật không hợp lệ."
        })
      };
    }

    /*
     * Xác thực thành công
     */
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        layer: currentLayer,
        role: account.role
      })
    };

  } catch (error) {

    console.error("ADMIN AUTH ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: "Lỗi máy chủ."
      })
    };
  }
};

