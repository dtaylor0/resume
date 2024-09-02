package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/url"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/template/html/v2"
	"github.com/gofiber/websocket/v2"
)

type PromptRequest struct {
	Prompt string `json:"prompt"`
}

type PromptResponse struct {
	Response string `json:"response"`
	Action   string `json:"action"`
	Path     string `json:"path"`
}

type ChatAPIResponse struct {
	Response string `json:"response"`
}

func main() {
	engine := html.New("./views", ".html")
	app := fiber.New(fiber.Config{Views: engine})
	app.Static("/static", "./public")

	LLM_SERVICE_URL := os.Getenv("LLM_SERVICE_URL")
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Render("index", fiber.Map{})
	})

	api := fiber.New()
	app.Mount("/api", api)

	api.Get("/title", func(c *fiber.Ctx) error {
		m := c.Queries()
		if m["title"] == "Drew Taylor" {
			return c.SendString("Taylor, Drew")
		}
		return c.SendString("Drew Taylor")
	})

	api.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	api.Get("/ws", websocket.New(func(c *websocket.Conn) {
		for {
			received := &PromptRequest{}
			err := c.ReadJSON(received)
			if err != nil {
				log.Println("Could not parse JSON")
				break
			}
			log.Printf("prompt: \"%s\"\n", received.Prompt)
			var buf bytes.Buffer
			engine.Render(&buf, "message", fiber.Map{"Class": "user", "Message": received.Prompt})
			c.WriteMessage(1, buf.Bytes())

			var (
				buf2    bytes.Buffer
				message string
			)

			log.Println("Accessing LLM at url:", LLM_SERVICE_URL)
			request := fiber.Get(LLM_SERVICE_URL)
			prompt := url.QueryEscape(received.Prompt)
			request.QueryString("prompt=" + prompt)
			_, data, errs := request.Bytes()
			if len(errs) > 0 {
				for _, err := range errs {
					log.Printf("Error: %v", err)
				}
				break
			}

			var res ChatAPIResponse
			jsonErr := json.Unmarshal(data, &res)
			if jsonErr != nil {
				break
			}

			message = res.Response
			engine.Render(&buf2, "message", fiber.Map{"Class": "bot", "Message": message})
			c.WriteMessage(1, buf2.Bytes())
		}
	}))

	app.Listen(":80")
}
