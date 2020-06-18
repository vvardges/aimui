import os


class Config:
    """
    Base Configuration
    """
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    """
    Development Configuration - default config
    """
    SQLALCHEMY_ECHO = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://aim_user:iu2g6udb982uyvUYGdwh093hioq0@0.0.0.0:5432/aim_db'
    DEBUG = True


class ProductionConfig(Config):
    """
    Production Configuration
    """
    SQLALCHEMY_DATABASE_URI = 'postgresql://aim_user:iu2g6udb982uyvUYGdwh093hioq0@0.0.0.0:5432/aim_db'
    DEBUG = False


config = {
    'dev': DevelopmentConfig,
    'prod': ProductionConfig,
}
