import datetime
import pytz


def default_created_at():
    return datetime.datetime.utcnow().replace(tzinfo=pytz.utc)


def normalize_type(val):
    if isinstance(val, str):
        if val == 'True':
            return True
        elif val == 'False':
            return False
        elif val == 'None':
            return None

        try:
            val = int(val)
        except:
            try:
                val = float(val)
            except:
                pass
    return val
