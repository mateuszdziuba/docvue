'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // TODO: Handle error with useFormState in future
    console.error('Login error:', error.message)
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const salonName = formData.get('salonName') as string
  const phone = formData.get('phone') as string || null

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    console.error('Signup error:', authError.message)
    redirect('/register?error=' + encodeURIComponent(authError.message))
  }

  if (!authData.user) {
    redirect('/register?error=' + encodeURIComponent('Nie udało się utworzyć konta'))
  }

  // 2. Create salon profile
  const { error: profileError } = await supabase
    .from('salons')
    .insert({
      user_id: authData.user.id,
      name: salonName,
      phone,
    })

  if (profileError) {
    console.error('Profile error:', profileError.message)
    redirect('/register?error=' + encodeURIComponent(profileError.message))
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
