from fastapi import HTTPException

def convert_quantity(quantity: float, source_unit: str, target_unit: str) -> float:
    source = getattr(source_unit, 'value', source_unit)
    target = getattr(target_unit, 'value', target_unit)
    if source == target:
        return quantity
    conversions = {("g", "kg"): 0.001, ("kg", "g"): 1000, ("ml", "l"): 0.001, ("l", "ml"): 1000}
    factor = conversions.get((source, target))
    if factor is None:
        raise HTTPException(status_code=422, detail="หน่วยในสูตรไม่ตรงกับหน่วยสต็อก")
    return quantity * factor
