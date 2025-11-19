#!/usr/bin/env python3
"""
Script to add DarkModeToggle component to pages that have the import but not the component
"""
import os
import re
from pathlib import Path

def add_toggle_to_auth_page(content):
    """Add toggle to auth pages (centered layout with absolute positioning)"""
    # Look for the main return div
    pattern = r'(return\s*\(\s*<div className="min-h-screen[^"]*">)'
    match = re.search(pattern, content)

    if match:
        insert_pos = match.end()
        toggle_html = '''
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
'''
        content = content[:insert_pos] + toggle_html + content[insert_pos:]
        return content, True
    return content, False

def add_toggle_to_standard_page(content):
    """Add toggle to standard pages with navbar"""
    # Try to find a pattern where we can insert the toggle
    # Look for NotificationBell or logout button patterns

    # Pattern 1: Before NotificationBell comment
    pattern1 = r'(\s+)(\/\* Notification Bell \*\/)'
    match = re.search(pattern1, content)
    if match:
        indent = match.group(1)
        insert_text = f'{indent}{{/* Dark Mode Toggle */}}\n{indent}<DarkModeToggle />\n\n{indent}'
        content = content[:match.start()] + insert_text + content[match.start():]
        return content, True

    # Pattern 2: In a flex container with space-x, before NotificationBell component
    pattern2 = r'(<div[^>]*className="[^"]*flex[^"]*space-x-[^"]*"[^>]*>)(\s*)(<NotificationBell)'
    match = re.search(pattern2, content)
    if match:
        div_tag = match.group(1)
        whitespace = match.group(2)
        bell_tag = match.group(3)
        indent = whitespace if whitespace.strip() == '' else '\n              '
        insert_text = f'{div_tag}{indent}<DarkModeToggle />{indent}{bell_tag}'
        content = content[:match.start()] + insert_text + content[match.end():]
        return content, True

    # Pattern 3: Before any button with handleLogout in a flex container
    pattern3 = r'(<div[^>]*className="[^"]*flex[^"]*items-center[^"]*"[^>]*>)([^<]*?)(<button[^>]*?onClick={handleLogout})'
    match = re.search(pattern3, content)
    if match:
        div_tag = match.group(1)
        whitespace = match.group(2)
        button_tag = match.group(3)
        # Add toggle before the logout button
        indent = '\n              ' if '\n' in whitespace else ' '
        insert_text = f'{div_tag}{whitespace}<DarkModeToggle />{indent}{button_tag}'
        content = content[:match.start()] + insert_text + content[match.end():]
        return content, True

    # Pattern 4: Look for header/nav with actions section
    pattern4 = r'(\/\* Actions \*\/\s*<div[^>]*>)'
    match = re.search(pattern4, content)
    if match:
        insert_pos = match.end()
        insert_text = '\n              <DarkModeToggle />\n              '
        content = content[:insert_pos] + insert_text + content[insert_pos:]
        return content, True

    return content, False

def process_file(file_path):
    """Process a single file to add DarkModeToggle component"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if already has the component
        if '<DarkModeToggle' in content:
            print(f"[SKIP] {file_path} - Already has component")
            return False

        # Skip if doesn't have the import
        if 'import DarkModeToggle' not in content:
            print(f"[SKIP] {file_path} - No import found")
            return False

        original_content = content

        # Determine if it's an auth page or standard page
        if 'auth' in str(file_path):
            content, modified = add_toggle_to_auth_page(content)
        else:
            content, modified = add_toggle_to_standard_page(content)

        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] {file_path}")
            return True
        else:
            print(f"[MANUAL] {file_path} - Needs manual intervention")
            return False

    except Exception as e:
        print(f"[ERROR] {file_path}: {e}")
        return False

def main():
    """Main function"""
    files_to_process = [
        'client/src/pages/auth/Register.tsx',
        'client/src/pages/auth/ForgotPassword.tsx',
        'client/src/pages/auth/ResetPassword.tsx',
        'client/src/pages/customer/Checkout.tsx',
        'client/src/pages/customer/MyReviews.tsx',
        'client/src/pages/customer/NearbyStores.tsx',
        'client/src/pages/customer/OrderHistory.tsx',
        'client/src/pages/customer/ProductBrowse.tsx',
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
    print("Adding DarkModeToggle Component to Pages")
    print("=" * 60)

    modified_count = 0
    manual_count = 0

    for file_path in files_to_process:
        path = Path(file_path)
        if path.exists():
            result = process_file(path)
            if result:
                modified_count += 1
            elif '[MANUAL]' in str(result):
                manual_count += 1
        else:
            print(f"[WARN] File not found: {file_path}")

    print("\n" + "=" * 60)
    print(f"Summary: Modified {modified_count} files")
    if manual_count > 0:
        print(f"         {manual_count} files need manual intervention")
    print("=" * 60)

if __name__ == '__main__':
    main()
