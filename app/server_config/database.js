sumeru.config.defineModule('database');
sumeru.config.database({
    dbname : 'test',
    mongoServer: '127.0.0.1',
    mongoPort: 27017,
    user: '',
    password: '',
    poolSize : 10
});


if(typeof process != 'undefined' && process.BAE){
    sumeru.config.database({
        dbname : 'your_bae_db_name'
    });
}