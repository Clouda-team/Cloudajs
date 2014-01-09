sumeru.config.defineModule('cluster');
sumeru.config.cluster({
      enable : false,
      host : 'your_redis_ip',
      port : 6379,
      dbname : 'your_redis_dbname',
      user: 'your_redis_user',
      password: 'your_redis_password'
});