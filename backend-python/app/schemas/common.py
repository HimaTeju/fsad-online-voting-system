from typing import Generic, Optional, TypeVar
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """Base for all request schemas — accepts camelCase JSON from the frontend."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CamelResponse(BaseModel):
    """Base for all response schemas — serializes to camelCase for the frontend."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        serialize_by_alias=True,
    )


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    @classmethod
    def ok(cls, data: T = None, message: str = "Success") -> "ApiResponse[T]":
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str, data: T = None) -> "ApiResponse[T]":
        return cls(success=False, message=message, data=data)
