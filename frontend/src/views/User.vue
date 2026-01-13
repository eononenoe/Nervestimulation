<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">사용자 관리</h1>
    </div>

    <!-- Loading -->
    <div v-if="userStore.loading" class="loading-container">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <span>데이터 로딩중...</span>
    </div>

    <template v-else>
      <v-card>
        <div class="ws-card-header">
          <span>사용자 목록</span>
          <v-btn color="primary" size="small" @click="showAddDialog = true">
            + 사용자 추가
          </v-btn>
        </div>
        <table class="ws-table" v-if="userStore.users.length > 0">
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>연락처</th>
              <th>밴드</th>
              <th>등록일</th>
              <th>권한</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userStore.users" :key="user.id">
              <td>{{ user.user_id || user.id }}</td>
              <td>{{ user.name || user.user_name }}</td>
              <td>{{ user.phone || user.contact || '-' }}</td>
              <td>{{ user.band_id || '-' }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <span :class="['ws-chip', user.role === 'admin' ? 'ws-chip-warning' : 'ws-chip-success']">
                  {{ user.role === 'admin' ? '관리자' : '사용자' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="no-data">등록된 사용자가 없습니다</div>
      </v-card>
    </template>

    <!-- Add User Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>사용자 추가</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newUser.name"
            label="이름"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="newUser.phone"
            label="연락처"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="newUser.email"
            label="이메일"
            type="email"
            variant="outlined"
            class="mb-4"
          ></v-text-field>
          <v-select
            v-model="newUser.role"
            :items="['user', 'admin']"
            label="권한"
            variant="outlined"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddDialog = false">취소</v-btn>
          <v-btn color="primary" @click="addUser" :loading="adding">추가</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store'

export default {
  name: 'UserView',
  setup() {
    const userStore = useUserStore()

    const showAddDialog = ref(false)
    const adding = ref(false)
    const newUser = ref({
      name: '',
      phone: '',
      email: '',
      role: 'user'
    })

    const formatDate = (date) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('ko-KR')
    }

    const addUser = async () => {
      if (!newUser.value.name) return

      adding.value = true
      try {
        await userStore.addUser({
          name: newUser.value.name,
          phone: newUser.value.phone,
          email: newUser.value.email,
          role: newUser.value.role
        })
        showAddDialog.value = false
        newUser.value = { name: '', phone: '', email: '', role: 'user' }
        await userStore.fetchUsers()
      } catch (error) {
        console.error('Failed to add user:', error)
      } finally {
        adding.value = false
      }
    }

    onMounted(async () => {
      await userStore.fetchUsers()
    })

    return {
      userStore,
      showAddDialog,
      adding,
      newUser,
      formatDate,
      addUser
    }
  }
}
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
  color: #666;
}

.no-data {
  padding: 48px;
  text-align: center;
  color: #888;
  font-size: 14px;
}
</style>
