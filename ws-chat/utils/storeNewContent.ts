import * as fs from "fs";

const contents = fs.readFileSync("./DrewTaylor.md", { encoding: "utf8" });

const res = await fetch("https://drtaylor.xyz/api/v1/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
});

if (res.status !== 200) {
    console.error(`Unsuccessful operation. ${await res.text()}`);
} else {
    console.log("Success!");
}
