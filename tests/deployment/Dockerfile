FROM docker:27.5.1-cli
RUN apk add --no-cache bash python3 openssl nginx curl
WORKDIR /work
CMD ["python3", "tests/deployment/test_setup.py"]
