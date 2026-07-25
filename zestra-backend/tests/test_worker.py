from app.workers.worker import WorkerSettings


def test_worker_settings_redis():
    assert WorkerSettings.redis_settings is not None
    assert WorkerSettings.redis_settings.ssl is True
