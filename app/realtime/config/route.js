/**
 * sumeru F / W
 * Copyright
 * License
 */

/**
 * route config
 * 
 */



/**
 * externalProcessors demo
 * 
 * sumeru.router.externalProcessor.add(function(hash){
 *     return true //代表有match，第三方processor接管了，fw停止向下执行
 *     //没有match的场景下可以return false或者不return
 * }, function(){}, .....)
 */

sumeru.router.add(
        {
            pattern    :   '/qunit',
            action  :   'App.ut'
        },
        
        {
            pattern: '/part1-of-test1',
            action:'App.subControllerTest'
        },
        
        {
          pattern: '/test1',
          action:'App.test1'
        },
        
        {
            pattern: '/test2',
            action:'App.test2'
        },
        
        {
            pattern: '/test3',
            action:'App.test3'
        },
        
        {
            pattern: '/test4',
            action:'App.test3'
        },

        {
            pattern    :   '/index',
            action  :   'App.docs'
        },
        
        
        {
            pattern    :   '/hp-showcase',
            action  :   'App.hp'
        },
        
        {
            pattern    :   '/hp-plain',
            action  :   'App.hpPlain'
        },      
        //fixME 看来得有的动态router了
        {
            pattern    :   '/hp-enyo',
            action  :   'App.hpEnyo'
        },      
        {
            pattern    :   '/hp-enterYourName',
            action  :   'App.hpEnterYourName'
        },
        //enyoEnterYourName
        {
            pattern    :   '/hp-enyoYourName',
            action  :   'App.enyoYourName'
        },
        {
            pattern    :   '/hp-login',
            action  :   'App.hpLogin'
        },
        {
            pattern    :   '/inf-login',
            action  :   'App.infLogin'
        },
        {
            pattern    :   '/inf-register',
            action  :   'App.infRegister'
        },
        {
            pattern    :   '/ba',
            action  :   'App.baLogin'
        },
        {
            pattern    :   '/ba-timeline',
            action  :   'App.baTimeline'
        },
        {
            pattern    :   '/ba-list',
            action  :   'App.baList'
        },
        {
            pattern    :   '/ba-item',
            action  :   'App.baItem'
        },
        {
            pattern    :   '/ba-login',
            action  :   'App.baLogin'
        },
        {
            pattern    :   '/docs',
            action  :   'App.docs'
        },
        {
            pattern:'/hi-login',
            action : 'App.hiLogin'
        },
        {
            pattern:'/hi-main-panel',
            action : 'App.hiMainPanel'
        },
        {
            pattern:'/hi-dialogbox',
            action : 'App.hiDialogBox'
        },
		{
            pattern:'/hi-discussion',
            action : 'App.discussion'
        },
		{
            pattern:'/hi-group',
            action : 'App.group'
        }
);
