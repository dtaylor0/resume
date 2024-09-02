FROM python:3.11-slim
WORKDIR /code
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt
COPY ./ /code
EXPOSE 3000
CMD ["fastapi", "run", "api.py", "--port", "3000"]
