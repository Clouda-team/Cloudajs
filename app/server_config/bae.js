//config file for bae
if(sumeru.BAE_VERSION){
  sumeru.config.database({
    dbname : 'yourdbname',
    user: 'yourpk',//bae 3.0 required
    password: 'yoursk',//bae 3.0 required
  }); 
  sumeru.config({
    site_url : '', //with tailing slash
  });
  sumeru.config.cluster({
      enable : false,
      dbname : 'yourdbname',
      user: 'yourpk',
      password: 'yoursk',
  });
}