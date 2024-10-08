// dialog.js
const systemAvatarUrl = 'http://eb118-file.cdn.bcebos.com/upload/406469d6dc2b4d1184a63cd51779e68e_1522258076.png?'; 
Page({
  data: {
    appName: "清小深", // 小程序名称
    appDescription: "积极心理对话助手", // 小程序介绍
    appAvatar: "/images/avatar.png", // 小程序头像路径
    integral: 100, // 积分显示
    isVoiceInput: false, // 是否为语音输入模式
    messages: [{'type': 'bot', 'content': '欢迎回来！有什么可以帮助您的吗？'}], // 存储对话消息
    inputText: '', // 用户输入的文本
    currentWord: 0, // 已经输入的字符长度
    systemMessageLength: 0, // 系统消息的字符长度
    userAvatar: 'cloud://mamashengde-4gg30e3261e1084b.6d61-mamashengde-4gg30e3261e1084b-1329081927/images/StudentAvatar.png', // 从index页面获取的用户头像URL
    systemAvatar: 'cloud://mamashengde-4gg30e3261e1084b.6d61-mamashengde-4gg30e3261e1084b-1329081927/images/teacher.png', // 系统固定的头像URL
    inputWidth: 100, 
    isInputActive: false,
    scrollTop: "",
  },
  
  onInput(event) {
    this.setData({
      inputText: event.detail.value, // 使用 event.detail.value 获取输入值
      isInputActive: event.detail.value.trim() !== '' // 使用 trim() 方法检查输入是否非空
    });
  },

  goBack: function() {
    this.saveConversation(() => {
      wx.switchTab({
        url: '/pages/index/index',
      });
    });
  },
  //用户点击发送按钮时触发
  sendMessage() {
    const { inputText, messages } = this.data;
    if (inputText.trim() === '') return; // 直接使用 inputText，因为它已经是文本
  
    messages.push({ type: 'user', content: inputText }); // 直接使用 inputText
    this.setData({
      messages,
      inputText: '',
      currentWord: inputText.length, // 直接使用 inputText 的长度
      isInputActive: false
    });
    const self = this;
    console.log(self.data.messages);
    wx.request({
      url: 'http://2.tcp.vip.cpolar.cn:14630/dialogue',
      method: 'POST',
      data: {
        message: inputText, // 直接使用 inputText
        messages: messages.slice(1, -1),
      },
      header: {
        'Content-Type': 'application/json',
      },
      success: function(res) {
        console.log('调用成功', res.data);
        const systemReply = res.data.response;
        setTimeout(() => {
          self.typeMessage(systemReply, 0);
        }, 500);
        self.autoScroll();
      },
      fail: function(err) {
        console.error('调用失败', err);
      }
    });
  },

  autoScroll(res) {
    var that = this
    let query = wx.createSelectorQuery()
    query.select('.display').boundingClientRect(res => {
        that.setData({
            scrollTop: 100000
        })
    })
    query.exec(res => {})

},

typeMessage(message, index) {
  const self = this;
  if (index < message.length) {
    const nextIndex = index + 1;
    const nextMessage = message.substring(0, nextIndex);
    const updatedMessages = self.data.messages;
    // 如果当前正在逐字显示的是最后一条消息，则更新内容
    if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].type === 'bot') {
      updatedMessages[updatedMessages.length - 1].content = nextMessage;
    } else {
      // 否则，将新消息推入消息数组
      updatedMessages.push({ type: 'bot', content: nextMessage });
    }
    self.setData({ messages: updatedMessages });
    // 设置下一次更新的定时器
    setTimeout(() => {
      self.typeMessage(message, nextIndex);
    }, 100); // 逐字更新的速度，可以根据需要调整
  }
},

onLoad: function(options) {
  if (options.messages) {
    // 从URL参数中解析messages
    const messages = JSON.parse(decodeURIComponent(options.messages));
    this.setData({
      messages: messages
    });
  } else {
    // 没有接收到messages参数，可能是直接从其他页面进入的
    this.setData({
      messages: [] // 设置为默认空数组或根据需要进行其他初始化操作
    });
    // 可以在这里进行更多的逻辑处理，比如从本地存储加载数据等
    this.loadDefaultChatData(); // 假设这是一个加载默认聊天数据的函数
  }
},

saveConversation: function(callback) {
  const self = this;
  const messages = this.data.messages;
  const currentTime = new Date(); // 获取当前时间

  // 如果没有消息或只有初始消息，则不进行保存
  if (messages.length <= 1 && messages[0].content === '欢迎回来！有什么可以帮助您的吗？') {
    if (callback) callback();
    return;
  }

  wx.cloud.callFunction({
    name: 'getWXContext',
    success: res => {
      const openid = res.result.openid;

      const db = getApp().globalData.db;
      db.collection('dialog_history').add({
        data: {
          openid: openid,
          messages: messages,
          timestamp: currentTime
        },
        success: res => {
          console.log('对话已保存到数据库', res);
          // 重置消息列表
          self.setData({
            messages: [{ 'type': 'bot', 'content': '欢迎回来！有什么可以帮助您的吗？'}]
          });
          if (callback) callback();
        },
        fail: err => {
          console.error('保存对话失败', err);
          if (callback) callback();
        }
      });
    },
    fail: err => {
      console.error('获取openid失败', err);
      if (callback) callback();
    }
  });
},

loadDefaultChatData: function() {
  this.setData({
    messages: [{'type': 'bot', 'content': '欢迎回来！有什么可以帮助您的吗？'}]
  });
},

showHistory: function() {
  this.saveConversation(() => {
    wx.navigateTo({
      url: '/pages/history/history',
    });
  });
},

clearConversation() {
  wx.showToast({
    title: '欢迎和我倾诉你遇到的问题～',
    icon: 'none'
  });
  const initialMessage = [{ 'type': 'bot', 'content': '欢迎回来！有什么可以帮助您的吗？'}];
  this.setData({
    messages: initialMessage
  });
},

createNewConversation() {
  wx.showToast({
    title: '欢迎和我倾诉你遇到的问题～',
    icon: 'none'
  });
  // Retrieve the openid and store the conversation
  wx.cloud.callFunction({
    name: 'getWXContext',
    success: res => {
      const openid = res.result.openid;
      const messages = this.data.messages;
      const currentTime = new Date();

      console.log('Current messages:', messages);

      // Store the new conversation in the database
      const db = getApp().globalData.db;
      db.collection('dialog_history').add({
        data: {
          openid: openid,
          messages: messages,
          timestamp: currentTime
        },
        success: res => {
          console.log('新对话已保存到数据库', res);
          // Set the initial message after successfully storing the conversation
          const initialMessage = [{ 'type': 'bot', 'content': '欢迎回来！有什么可以帮助您的吗？'}];
          this.setData({
            messages: initialMessage
          });
        },
        fail: err => {
          console.error('保存对话失败', err);
        }
      });
    },
    fail: err => {
      console.error('获取openid失败', err);
    }
  });
}
});
