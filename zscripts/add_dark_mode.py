#!/usr/bin/env python3
"""
Script to add dark mode support to all React pages
"""
import os
import re
from pathlib import Path

# Dark mode class mappings
CLASS_MAPPINGS = {
    r'bg-gray-50(?!\s*dark:)': 'bg-gray-50 dark:bg-gray-900',
    r'bg-gray-100(?!\s*dark:)': 'bg-gray-100 dark:bg-gray-900',
    r'bg-white(?!\s*dark:)': 'bg-white dark:bg-gray-800',
    r'text-gray-600(?!\s*dark:)': 'text-gray-600 dark:text-gray-300',
    r'text-gray-700(?!\s*dark:)': 'text-gray-700 dark:text-gray-200',
    r'text-gray-800(?!\s*dark:)': 'text-gray-800 dark:text-gray-100',
    r'text-gray-900(?!\s*dark:)': 'text-gray-900 dark:text-white',
    r'text-green-800(?!\s*dark:)': 'text-green-800 dark:text-green-400',
    r'text-blue-600(?!\s*dark:)': 'text-blue-600 dark:text-blue-400',
    r'text-indigo-600(?!\s*dark:)': 'text-indigo-600 dark:text-indigo-400',
}

def get_import_path(file_path):
    """Calculate correct import path based on file location"""
    parts = Path(file_path).parts
    if 'auth' in parts:
        return '../components/DarkModeToggle'
    else:
        return '../../components/DarkModeToggle'

def add_import(content, file_path):
    """Add DarkModeToggle import if not present"""
    if 'DarkModeToggle' in content:
        return content, False

    import_path = get_import_path(file_path)
    import_statement = f"import DarkModeToggle from '{import_path}';"

    # Find the last import statement
    import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];)"
    matches = list(re.finditer(import_pattern, content))

    if matches:
        last_import = matches[-1]
        insert_pos = last_import.end()
        content = content[:insert_pos] + '\n' + import_statement + content[insert_pos:]
        return content, True

    return content, False

def add_dark_mode_classes(content):
    """Add dark mode classes to existing color classes"""
    modified = False
    for pattern, replacement in CLASS_MAPPINGS.items():
        # Use word boundaries and negative lookahead to avoid double-adding
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            modified = True
            content = new_content

    return content, modified

def add_dark_mode_toggle(content, file_path):
    """Add DarkModeToggle component to the header/nav section"""
    if '<DarkModeToggle />' in content:
        return content, False

    # Try to find NotificationBell and add before it
    notification_pattern = r'(\s*)(\/\*.*?Notification Bell.*?\*\/\s*)?(<NotificationBell)'
    match = re.search(notification_pattern, content, re.DOTALL)

    if match:
        indent = match.group(1)
        insert_text = f'\n{indent}{{/* Dark Mode Toggle */}}\n{indent}<DarkModeToggle />\n{indent}'
        content = content[:match.start(3)] + insert_text + content[match.start(3):]
        return content, True

    # Try to find logout button as fallback
    logout_pattern = r'(<button[^>]*?onClick={handleLogout})'
    match = re.search(logout_pattern, content)

    if match:
        # Find the opening of the container (usually a div with flex)
        container_pattern = r'(<div[^>]*?className="[^"]*flex[^"]*"[^>]*>)([^<]*?)' + re.escape(match.group(0))
        container_match = re.search(container_pattern, content)

        if container_match:
            insert_pos = container_match.end(2)
            indent = container_match.group(2)
            if not indent.strip():
                indent = '              '
            insert_text = f'\n{indent}<DarkModeToggle />\n{indent}'
            content = content[:insert_pos] + insert_text + content[insert_pos:]
            return content, True

    return content, False

def process_file(file_path):
    """Process a single file to add dark mode support"""
    print(f"\nProcessing: {file_path}")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes = []

        # Step 1: Add import
        content, imported = add_import(content, file_path)
        if imported:
            changes.append("Added DarkModeToggle import")

        # Step 2: Add dark mode classes
        content, classes_added = add_dark_mode_classes(content)
        if classes_added:
            changes.append("Added dark mode classes")

        # Step 3: Add toggle component to header
        content, toggle_added = add_dark_mode_toggle(content, file_path)
        if toggle_added:
            changes.append("Added DarkModeToggle component")

        # Write back if any changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  [OK] {', '.join(changes)}")
            return True
        else:
            print(f"  [SKIP] No changes needed")
            return False

    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    """Main function to process all page files"""
    base_dir = Path('client/src/pages')

    # Skip customer/Dashboard.tsx as it's already done
    skip_files = {'client/src/pages/customer/Dashboard.tsx'}

    # Define page categories
    pages = {
        'Retailer': [
            'retailer/Dashboard.tsx',
            'retailer/InventoryManagement.tsx',
            'retailer/B2BMarketplace.tsx',
            'retailer/B2BCheckout.tsx',
            'retailer/B2BOrderHistory.tsx',
            'retailer/B2BOrderDetails.tsx',
            'retailer/OrderManagement.tsx',
            'retailer/SalesAnalytics.tsx',
            'retailer/CustomerHistory.tsx',
            'retailer/ProductReviews.tsx',
        ],
        'Wholesaler': [
            'wholesaler/Dashboard.tsx',
            'wholesaler/BulkOrders.tsx',
            'wholesaler/B2BOrderDetails.tsx',
            'wholesaler/InventoryManagement.tsx',
            'wholesaler/RetailerNetwork.tsx',
            'wholesaler/Analytics.tsx',
        ],
        'Customer': [
            'customer/ProductBrowse.tsx',
            'customer/Wishlist.tsx',
            'customer/OrderHistory.tsx',
            'customer/NearbyStores.tsx',
            'customer/Checkout.tsx',
            'customer/MyReviews.tsx',
            'customer/TransactionHistory.tsx',
        ],
        'Auth': [
            'auth/Login.tsx',
            'auth/Register.tsx',
            'auth/ForgotPassword.tsx',
            'auth/ResetPassword.tsx',
        ],
    }

    total_files = 0
    modified_files = 0

    print("=" * 60)
    print("Adding Dark Mode Support to All Pages")
    print("=" * 60)

    for category, file_list in pages.items():
        print(f"\n{'=' * 60}")
        print(f"{category} Pages")
        print(f"{'=' * 60}")

        for file_name in file_list:
            file_path = base_dir / file_name
            full_path = str(file_path).replace('\\', '/')

            if full_path in skip_files:
                print(f"\n[SKIP] Skipping: {file_path} (already done)")
                continue

            if file_path.exists():
                total_files += 1
                if process_file(file_path):
                    modified_files += 1
            else:
                print(f"\n[WARN] File not found: {file_path}")

    print("\n" + "=" * 60)
    print(f"Summary: Modified {modified_files}/{total_files} files")
    print("=" * 60)

if __name__ == '__main__':
    main()
