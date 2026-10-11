const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Course Registration System API is running",
    });
});

const PORT = 5003;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});