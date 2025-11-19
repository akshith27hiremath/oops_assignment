#!/usr/bin/env python3
"""
Final script to add DarkModeToggle to remaining pages
"""
import re
from pathlib import Path

def add_toggle_generic(content):
    """Generic pattern matching to add toggle"""

    # Pattern 1: Inside <div className="flex items-center gap-X"> BEFORE other items
    pattern1 = r'(<div className="flex items-center gap-\d+">)(\s*)'
    matches = list(re.finditer(pattern1, content))

    for match in reversed(matches):  # Process from end to avoid offset issues
        # Check if DarkModeToggle is already nearby
        nearby_content = content[match.end():match.end()+200]
        if '<DarkModeToggle' not in nearby_content:
            div_tag = match.group(1)
            whitespace = match.group(2) if match.group(2) else '\n              '
            insert_text = f'{div_tag}{whitespace}<DarkModeToggle />{whitespace}'
            content = content[:match.start()] + insert_text + content[match.end():]
            return content, True

    # Pattern 2: Inside <div className="flex ... space-x-X"> BEFORE other items
    pattern2 = r'(<div[^>]*className="[^"]*flex[^"]*space-x-\d+[^"]*"[^>]*>)(\s*)'
    matches = list(re.finditer(pattern2, content))

    for match in reversed(matches):
        nearby_content = content[match.end():match.end()+200]
        if '<DarkModeToggle' not in nearby_content and 'logout' in nearby_content.lower():
            div_tag = match.group(1)
            whitespace = match.group(2) if match.group(2) else '\n              '
            insert_text = f'{div_tag}{whitespace}<DarkModeToggle />{whitespace}'
            content = content[:match.start()] + insert_text + content[match.end():]
            return content, True

    # Pattern 3: Before Link to dashboard or similar navigation
    pattern3 = r'(<div[^>]*className="[^"]*flex[^>]*>)(\s*)(<Link to="/[^/]+/dashboard")'
    match = re.search(pattern3, content)
    if match:
        nearby = content[max(0, match.start()-100):match.end()+100]
        if '<DarkModeToggle' not in nearby:
            div_tag = match.group(1)
            whitespace = match.group(2) if match.group(2) else '\n              '
            link_tag = match.group(3)
            insert_text = f'{div_tag}{whitespace}<DarkModeToggle />{whitespace}{link_tag}'
            content = content[:match.start()] + insert_text + content[match.end():]
            return content, True

    return content, False

def process_file(file_path):
    """Process file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        if '<DarkModeToggle' in content:
            return False

        if 'import DarkModeToggle' not in content:
            return False

        original = content
        content, modified = add_toggle_generic(content)

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] {file_path}")
            return True
        else:
            print(f"[MANUAL] {file_path}")
            return False

    except Exception as e:
        print(f"[ERROR] {file_path}: {e}")
        return False

def main():
    files = [
        'client/src/pages/customer/Checkout.tsx',
        'client/src/pages/customer/MyReviews.tsx',
        'client/src/pages/customer/NearbyStores.tsx',
        'client/src/pages/customer/OrderHistory.tsx',
        'client/src/pages/customer/TransactionHistory.tsx',
        'client/src/pages/customer/Wishlist.tsx',
        'client/src/pages/retailer/B2BCheckout.tsx',
        'client/src/pages/retailer/B2BMarketplace.tsx',
        'client/src/pages/retailer/B2BOrderDetails.tsx',
        'client/src/pages/retailer/B2BOrderHistory.tsx',
        'client/src/pages/retailer/CustomerHistory.tsx',
        'client/src/pages/retailer/OrderManagement.tsx',
        'client/src/pages/retailer/ProductReviews.tsx',
        'client/src/pages/retailer/SalesAnalytics.tsx',
        'client/src/pages/wholesaler/Analytics.tsx',
        'client/src/pages/wholesaler/B2BOrderDetails.tsx',
        'client/src/pages/wholesaler/InventoryManagement.tsx',
        'client/src/pages/wholesaler/RetailerNetwork.tsx',
    ]

    print("=" * 60)
    print("Final Pass: Adding DarkModeToggle")
    print("=" * 60)

    modified = 0
    for f in files:
        if Path(f).exists() and process_file(Path(f)):
            modified += 1

    print(f"\n{modified} files modified")

if __name__ == '__main__':
    main()
