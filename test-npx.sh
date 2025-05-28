#!/bin/bash

# Test script for spec-up-migrate NPX tool
echo "Testing spec-up-migrate NPX script..."

# Create a test directory
mkdir -p /tmp/spec-up-test
cd /tmp/spec-up-test

# Create a sample spec file
cat > sample-spec.md << 'EOF'
---
spec_version: "1.0"
title: "Test Specification"
description: "A test specification for migration"
---

# Test Specification

This is a sample specification to test the migration tool.

## Requirements

- Must support version migration
- Should preserve content structure
- Must update metadata appropriately
EOF

echo "Created test specification file:"
cat sample-spec.md

echo -e "\n=== Testing spec-up-migrate commands ==="

echo -e "\n1. Testing help command:"
spec-up-migrate --help

echo -e "\n2. Testing dry run migration:"
spec-up-migrate migrate sample-spec.md --dry-run

echo -e "\n3. Testing actual migration:"
spec-up-migrate migrate sample-spec.md

echo -e "\n4. Checking migrated content:"
if [ -f "migrated/sample-spec.md" ]; then
    echo "Migration successful! Content:"
    cat migrated/sample-spec.md
else
    echo "Migration failed - no output file found"
fi

echo -e "\n5. Testing validation:"
spec-up-migrate validate sample-spec.md

echo -e "\n=== Test completed ==="

# Cleanup
cd /
rm -rf /tmp/spec-up-test
