//config file for bae
if(sumeru.BAE_VERSION){
  sumeru.config.database({
    dbname : 'your_bae_db_name',
    user: 'your_bae_ak',//bae 3.0 required
    password: 'your_bae_sk',//bae 3.0 required
  }); 
  sumeru.config({
    site_url : 'http://yourapp.duapp.com/', //with tailing slash
  }); 

}