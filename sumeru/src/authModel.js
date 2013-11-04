Model = Model || {};

/**
 * 长效认证model,
 * 这里的每一条数据即表示一个特定用户在某一个唯一设备上登陆成功的状态.
 * 当用户登陆时即产生一条对应的记录.当用户登出或超时后,将被删除.
 */
Model.smr_Authentication = function(exports){
    exports.config = {
        fields: [
            {name: 'clientId', type: 'string'},                         // 当前设备id,主索引
            {name: 'token',  type: 'string', defaultValue : 'guest'},   // 当前登陆用户名
            {name: 'userId', type: 'string'},                           // 与用户系统所关联的一个值,用于在用户系统中检索唯一用户
            {name: 'info', type: 'object'},                             // 附加信息，来源自用户系统返回的，希望在当前用户活动过程中被使用到的一些数据
            {name: 'authMethod', type: 'string'},                     // 当前的登陆类型, local|baidu|tpa
            {name: 'expires', type: 'int'},                             // 超时时间,当用到达指定时间时,当前登陆则超时.
            {name: 'status', type: 'string', defaultValue : 'offline'},  // 标记当前在线或离线状态, online | offline
            {name: 'remoteAddr', type: 'string'}                         // 记录当前登陆IP,随status变化而记录最新值.
        ],
        indexes:[
                 { 'clientId' : 1 },
                 { 'expires' : -1 }
        ]
    };
};


/**
 * 本地用户系统的用户信息
 */
Model.smr_LocaleUser = function(exports){
    exports.config = {
        fields: [
            {name: 'userId', type: 'string'},                               // 用户的唯一id.
            {name: 'token',  type: 'string',},                              // 用于登陆的一个名称
            {name: 'pwd',  type: 'string',},                                // 保存加密后的用户登陆口令.
            {name: 'info', type: 'object'},                                 // 附加信息.
            {name: 'secretKey', type: 'string'}                             // 将用aes192计算一个验证session中记录用户数据有效性的验证字符串.每次用户信息变更时将更新这个值
        ],
        indexes:[
            {"userId":1},
            {"token":1,"pwd":1}
        ]
    };
};
