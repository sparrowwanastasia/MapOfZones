list_users_schema = {
    "type": "object",
    "properties": {
        "page": {"type": "integer"},
        "per_page": {"type": "integer"},
        "total": {"type": "integer"},
        "total_pages": {"type": "integer"},
        "data": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "email": {"type": "string"},
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "avatar": {"type": "string"},
                },
                "required": ["id", "email", "first_name", "last_name"]
            },
        },
        "support": {"type": "object"},
    },
    "required": ["page", "data"],
}

single_user_schema = {
    "type": "object",
    "properties": {
        "data": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "email": {"type": "string"},
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "avatar": {"type": "string"},
            },
            "required": ["id", "email", "first_name", "last_name"]
        },
        "support": {"type": "object"},
    },
    "required": ["data"],
}

created_user_schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "job": {"type": "string"},
        "id": {"type": "string"},
        "createdAt": {"type": "string"},
    },
    "required": ["name", "job", "id", "createdAt"],
}

not_found_schema = {
    "type": "object",
    "maxProperties": 0
}
