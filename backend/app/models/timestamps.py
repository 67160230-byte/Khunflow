"""Keep the existing UTC timestamp-without-time-zone schema across SQLModel versions."""
from datetime import timezone
from sqlalchemy import DateTime, TypeDecorator


class UTCNaiveDateTime(TypeDecorator):
    impl = DateTime(timezone=False)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None: return None
        if value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is None: return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
