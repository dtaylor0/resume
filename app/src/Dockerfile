FROM golang:1.22-alpine
WORKDIR /code
COPY ./ /code
RUN go mod download
RUN go build -o app
EXPOSE 80
CMD ["./app"]
