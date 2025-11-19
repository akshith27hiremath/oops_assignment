#!/usr/bin/env python3
"""
Manually add toggles by finding Link to dashboard patterns
"""
import re
from pathlib import Path

files_to_fix = [
    'client/src/pages/customer/MyReviews.tsx',
    'client/src/pages/retailer/B2BCheckout.tsx',
    'client/src/pages/retailer/B2BOrderDetails.tsx',
    'client/src/pages/retailer/B2BOrderHistory.tsx',
    'client/src/pages/retailer/CustomerHistory.tsx',
    'client/src/pages/retailer/OrderManagement.tsx',
    'client/src/pages/retailer/SalesAnalytics.tsx',
    'client/src/pages/wholesaler/Analytics.tsx',
    'client/src/pages/wholesaler/B2BOrderDetails.tsx',
    'client/src/pages/wholesaler/InventoryManagement.tsx',
    'client/src/pages/wholesaler/RetailerNetwork.tsx',
]

def add_toggle(file_path):
    """Add toggle before Link to dashboard"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<DarkModeToggle' in content:
        print(f"[SKIP] {file_path} - Already has toggle")
        return False

    # Pattern: Find Link inside header that goes to dashboard
    # We want to wrap it in a div with the toggle
    pattern = r'(<Link to="/[^/]+/dashboard"[^>]*>[^<]*</Link>)'

    match = re.search(pattern, content)
    if match:
        link_tag = match.group(1)
        # Check if there's already a wrapping div
        before = content[max(0, match.start()-100):match.start()]
        if '<div className="flex items-center gap-' in before:
            # Already wrapped, just add toggle before Link
            insert_text = f'<DarkModeToggle />\n              {link_tag}'
            content = content[:match.start()] + insert_text + content[match.end():]
        else:
            # Need to wrap both toggle and link
            insert_text = f'<div className="flex items-center gap-4">\n              <DarkModeToggle />\n              {link_tag}\n            </div>'
            content = content[:match.start()] + insert_text + content[match.end():]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] {file_path}")
        return True
    else:
        print(f"[FAILED] {file_path} - Pattern not found")
        return False

def main():
    modified = 0
    for f in files_to_fix:
        path = Path(f)
        if path.exists():
            if add_toggle(path):
                modified += 1

    print(f"\n{modified} files modified")

if __name__ == '__main__':
    main()
