<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>AI助手</h1>
      <div class="header-buttons">
        <button @click="showHistory" class="header-btn history-btn" title="查看历史">查看历史</button>
        <button @click="cleanHistory" class="header-btn history-btn" title="删除历史">删除历史</button>
      </div>
    </div>
    <div class="chat-box" ref="chatBox">
      <div v-for="(msg, index) in messages" :key="index" :class="['chat-msg', msg.role]">
        <div class="bubble">
          <span class="role-label">{{ msg.role === 'user' ? '🧑‍💻 我' : '🤖 模型' }}</span>
          <div class="text">{{ msg.text }}</div>
        </div>
      </div>
      <div v-if="loading" class="chat-msg bot">
        <div class="bubble">
          <span class="role-label">🤖 模型</span>
          <div class="text">正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="input-area">
      <input type="text" v-model="input" placeholder="请输入您的问题..." />
      <button type="submit">发送</button>
    </form>

    <div v-if="showHistoryModal" class="modal-overlay" @click="closeHistory">
      <div class="modal-content" @click.stop>
        <!-- header -->
        <div class="modal-header">
          <h3>对话历史记录</h3>
          <button @click="closeHistory" class="close-btn">✖️</button>
        </div>
        <!-- content -->
        <div class="modal-body">
          <div v-if="historyList.length === 0" class="no-history">暂时没有历史会话</div>
          <div v-else class="history-list">
            <div v-for="(msg, index) in historyList" :key="index" :class="['history-msg', msg.role]">
              <div class="history-bubble">
                <span class="role-label">{{ msg.role === 'user' ? '🧑‍💻 我' : '🤖 模型' }}</span>
                <div class="text">{{ msg.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- footer -->
        <div class="modal-footer">
          <button @click="closeHistory" class="modal-btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, reactive } from 'vue';
const input = ref('');
const messages = ref<{ role: 'user' | 'bot'; text: string }[]>([]);
const loading = ref(false);
const chatBox = ref<HTMLElement | null>(null);
const showHistoryModal = ref(false);
const historyList = ref<{ role: 'user' | 'bot'; content: string }[]>([]);

async function handleSubmit() {
  const question = input.value.trim();
  if (!question) return;

  messages.value.push({
    role: 'user',
    text: question,
  });
  input.value = '';
  loading.value = true;

  await nextTick();
  chatBox.value?.scrollTo({
    top: chatBox.value.scrollHeight,
    behavior: 'smooth',
  });

  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const reader = res.body?.getReader();
  if (!reader) {
    console.error('响应流为空');
    loading.value = false;
    return;
  }
  const decoder = new TextDecoder('utf-8');
  let botMessage = '';
  const newMessage = reactive({
    role: 'bot' as const,
    text: '',
  });
  messages.value.push(newMessage);
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.response) {
          if (loading.value) {
            loading.value = false;
          }
          botMessage += data.response;
          newMessage.text = botMessage;
        }
      } catch (e) {
        console.error('JSON解析失败: ', e);
      }
    }
  }

  await nextTick();
  chatBox.value?.scrollTo({
    top: chatBox.value.scrollHeight,
    behavior: 'smooth',
  });
}

async function cleanHistory() {
  if (!confirm('确定要清空历史记录吗?该操作不可逆')) {
    return;
  }
  try {
    const res = await fetch('/api/clean', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      alert('对话历史已删除');
    } else {
      alert('清除失败,请稍后再试');
    }
  } catch {
    alert('清除失败,请检查网络');
  }
}

async function showHistory() {
  try {
    const res = await fetch('/api/history');
    if (res.ok) {
      const data = await res.json();
      historyList.value = data.conversations;
      showHistoryModal.value = true;
    } else {
      alert('获取历史记录失败');
    }
  } catch {
    alert('获取历史记录失败, 请检查网络');
  }
}

function closeHistory() {
  showHistoryModal.value = false;
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #eee;
  border-right: 1px solid #eee;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ddd;
  background: #f7f7f7;
}

.chat-header h1 {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.header-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-btn {
  background-color: #17a2b8;
  color: white;
}

.history-btn:hover {
  background-color: #138496;
}

.clear-btn {
  background-color: #dc3545;
  color: white;
}

.clear-btn:hover {
  background-color: #c82333;
}

.chat-box {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.chat-msg {
  display: flex;
  margin-bottom: 12px;
}

.chat-msg.user {
  justify-content: flex-end;
}

.chat-msg.bot {
  justify-content: flex-start;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  line-height: 1.4;
  position: relative;
}

.chat-msg.user .bubble {
  background: #daf1ff;
  color: #333;
  border-bottom-right-radius: 4px;
}

.chat-msg.bot .bubble {
  background: #e6e6e6;
  color: #222;
  border-bottom-left-radius: 4px;
}

.role-label {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}

.input-area {
  display: flex;
  padding: 12px;
  border-top: 1px solid #ddd;
  background: #fff;
}

.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ccc;
  border-radius: 20px;
  font-size: 16px;
  outline: none;
}

.input-area button {
  margin-left: 10px;
  padding: 10px 18px;
  font-size: 16px;
  border: none;
  border-radius: 20px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.input-area button:hover {
  background-color: #0056b3;
}

.input-area button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.no-history {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-msg {
  display: flex;
}

.history-msg.user {
  justify-content: flex-end;
}

.history-msg.assistant {
  justify-content: flex-start;
}

.history-bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.4;
}

.history-msg.user .history-bubble {
  background: #daf1ff;
  color: #333;
}

.history-msg.assistant .history-bubble {
  background: #e6e6e6;
  color: #222;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.modal-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #6c757d;
  color: white;
  cursor: pointer;
}

.modal-btn:hover {
  background-color: #5a6268;
}

.dot {
  animation: blink 1s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}
</style>
