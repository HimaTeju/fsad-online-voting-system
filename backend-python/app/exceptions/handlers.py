from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


def _error_response(status: int, message: str, errors: dict | None = None):
    body = {
        "status": status,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if errors:
        body["errors"] = errors
    return JSONResponse(status_code=status, content=body)


def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return _error_response(exc.status_code, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = {}
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
            errors[field] = error["msg"]
        return _error_response(422, "Validation failed", errors)

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        return _error_response(500, "Internal server error")
