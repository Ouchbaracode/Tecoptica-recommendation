from sqlalchemy import Column, Integer, String, Text, Numeric, ARRAY, DateTime
from sqlalchemy.sql import func
from database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(255), nullable=True)
    
    # Store compatible face shapes as a string array (e.g. ['round', 'oval', 'heart'])
    face_shapes = Column(ARRAY(Text), nullable=False)
    created_at = Column(DateTime, default=func.now())
