from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class ProductBase(BaseModel):
    name: str = Field(..., max_length=100, description="Name of the eyewear model")
    brand: str = Field(..., max_length=100, description="Brand name of the eyewear")
    description: Optional[str] = Field(None, description="Optional styling or design details")
    price: Decimal = Field(..., gt=0, description="Selling price of the eyewear")
    image_url: Optional[str] = Field(None, max_length=255, description="Image link for displaying product graphics")
    face_shapes: List[str] = Field(..., description="Array of matching face shapes (e.g., ['round', 'oval'])")

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True
