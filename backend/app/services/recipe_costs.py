from sqlmodel import select
from app.models import Recipe, RecipeItem, Ingredient, Product
from app.services.unit_conversion import convert_quantity

async def refresh_recipe_costs(session, business_id, ingredient_id):
    ids = (await session.execute(select(RecipeItem.recipe_id).join(Recipe, Recipe.id == RecipeItem.recipe_id)
        .where(Recipe.business_id == business_id, RecipeItem.ingredient_id == ingredient_id))).scalars().all()
    if not ids: return
    rows = (await session.execute(select(RecipeItem, Ingredient).join(Ingredient, Ingredient.id == RecipeItem.ingredient_id)
        .where(RecipeItem.recipe_id.in_(ids), Ingredient.business_id == business_id))).all()
    totals = {}
    for line, ingredient in rows:
        line.unit_cost = ingredient.average_cost * convert_quantity(1, line.unit, ingredient.unit)
        line.total_cost = line.quantity * line.unit_cost
        totals[line.recipe_id] = totals.get(line.recipe_id, 0) + line.total_cost
    recipes = (await session.execute(select(Recipe, Product).join(Product, Product.id == Recipe.product_id)
        .where(Recipe.id.in_(ids), Recipe.business_id == business_id, Product.business_id == business_id))).all()
    for recipe, product in recipes:
        recipe.total_cost = totals.get(recipe.id, 0)
        product.food_cost = recipe.total_cost / recipe.yield_amount
