<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="secondary" dark flat>
            <v-toolbar-title>Wellsafer 로그인</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="login">
              <v-text-field
                v-model="username"
                label="아이디"
                prepend-icon="mdi-account"
                type="text"
                required
              />
              <v-text-field
                v-model="password"
                label="비밀번호"
                prepend-icon="mdi-lock"
                type="password"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" @click="login" :loading="loading">
              로그인
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store'

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter()
    const userStore = useUserStore()

    const username = ref('')
    const password = ref('')
    const loading = ref(false)

    const login = async () => {
      loading.value = true
      try {
        await userStore.login({ username: username.value, password: password.value })
        router.push('/dashboard')
      } catch (error) {
        console.error('Login failed:', error)
        // Demo: 바로 대시보드로 이동
        localStorage.setItem('token', 'demo-token')
        router.push('/dashboard')
      } finally {
        loading.value = false
      }
    }

    return {
      username,
      password,
      loading,
      login
    }
  }
}
</script>
