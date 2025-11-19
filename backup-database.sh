#!/bin/bash

# LiveMart Database Backup Script
# Creates a backup of the database before running cleanup

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="livemart_backup_${TIMESTAMP}"

echo "========================================="
echo "LiveMart Database Backup"
echo "========================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_NAME"
echo ""

# Run mongodump inside the Docker container
docker exec livemart-mongodb-dev mongodump \
  --uri="mongodb://admin:password123@localhost:27017/livemart_dev?authSource=admin" \
  --out="/tmp/$BACKUP_NAME" \
  --gzip

# Copy backup from container to host
docker cp livemart-mongodb-dev:/tmp/$BACKUP_NAME "$BACKUP_DIR/"

# Clean up container backup
docker exec livemart-mongodb-dev rm -rf "/tmp/$BACKUP_NAME"

echo ""
echo "========================================="
echo "✅ Backup created: $BACKUP_DIR/$BACKUP_NAME"
echo "========================================="
echo ""
echo "To restore this backup:"
echo "  docker exec -i livemart-mongodb-dev mongorestore \\"
echo "    --uri=\"mongodb://admin:password123@localhost:27017\" \\"
echo "    --gzip \\"
echo "    --drop \\"
echo "    /backups/$BACKUP_NAME"
