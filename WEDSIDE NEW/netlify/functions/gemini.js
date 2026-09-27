export default async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { error: "Chỉ hỗ trợ POST" },
      { status: 405 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return Response.json(
        { error: "Thiếu prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY_PHUOCDEV;

    if (!apiKey) {
      return Response.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trên Netlify" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: "gemini-3.6-flash",
          input: prompt,
          generation_config: {
            thinking_level: "low"
          }
        }),
      }
    );

    const data = await response.json();

   if (!response.ok) {
  console.error("GEMINI ERROR:", response.status, data);

  return Response.json(
    {
      error: data?.error?.message || data || "Gemini API lỗi",
      status: response.status,
    },
    { status: response.status }
  );
}

    // Lấy text từ steps của Interactions API
    const text = (data.steps || [])
      .filter(step => step.type === "model_output")
      .flatMap(step => step.content || [])
      .filter(content => content.type === "text")
      .map(content => content.text)
      .join("");

    return Response.json({
      text: text || "Gemini không trả về nội dung."
    });

  } catch (error) {
    console.error("Function error:", error);

    return Response.json(
      {
        error: error.message || "Lỗi server",
      },
      { status: 500 }
    );
  }
};