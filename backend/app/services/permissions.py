from copy import deepcopy

KEYS = ('dashboard', 'products', 'orders', 'inventory', 'stock_count', 'waste', 'purchasing', 'analytics', 'forecast', 'users', 'settings')
DEFAULTS = {
    'owner': dict.fromkeys(KEYS, True),
    'manager': {key: key != 'settings' for key in KEYS},
    'inventory_staff': {key: key in ('inventory', 'stock_count', 'waste', 'purchasing') for key in KEYS},
    'cashier': {key: key == 'orders' for key in KEYS},
}

def permissions_for(stored, role):
    result = deepcopy(DEFAULTS.get(role, dict.fromkeys(KEYS, False)))
    if role != 'owner':
        result.update((stored or {}).get(role, {}))
    return result

def feature_for(path):
    path = path.removeprefix('/api/').split('/')[0]
    return {
        'dashboard': 'dashboard', 'setup-status': 'dashboard', 'products': 'products',
        'recipes': 'products', 'orders': 'orders', 'ingredients': 'inventory',
        'receiving': 'inventory', 'expiration-status': 'inventory', 'stock-counts': 'stock_count',
        'waste': 'waste', 'suppliers': 'purchasing', 'purchase-orders': 'purchasing',
        'purchase-recommendations': 'purchasing', 'analytics': 'analytics', 'forecast': 'forecast',
        'business': 'settings',
    }.get(path)
