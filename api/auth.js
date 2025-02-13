export default function handler(req, res) {
    const authHeader = req.headers.authorization;
    const urlPath = req.url.replace("/api/auth/", ""); // 提取 slug

    const passwordMap = {
        "secret-post": process.env.SECRET_POST_PASSWORD
    };

    const correctPassword = passwordMap[urlPath];

    if (!correctPassword) {
        return res.status(404).send("Not Found");
    }

    const expectedAuth = "Basic " + Buffer.from(`user:${correctPassword}`).toString("base64");

    if (authHeader !== expectedAuth) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Protected Area"');
        res.status(401).send("Unauthorized");
        return;
    }

    res.status(200).send("Authenticated");
}
