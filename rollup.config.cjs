const { string } = require("rollup-plugin-string")

module.exports = {
    input: "src/main.js",
    output: { file: "userscript.js", format: "iife" },
    logLevel: "silent",
    plugins: [
        string({
            include: "src/styles.css",
        })
    ]
}