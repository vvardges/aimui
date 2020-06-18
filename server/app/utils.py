import datetime
import pytz


def default_created_at():
    return datetime.datetime.utcnow().replace(tzinfo=pytz.utc)
