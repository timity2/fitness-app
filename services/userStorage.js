
import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = '@fitness_users';
const LEGACY_USER_KEY = '@fitness_user';

async function getUsers() {
  try {
    const storedUsers = await AsyncStorage.getItem(USERS_KEY);

    if (storedUsers) {
      return JSON.parse(storedUsers);
    }

    // Перенос старого сохранённого пользователя
    const oldUser = await AsyncStorage.getItem(LEGACY_USER_KEY);

    if (oldUser) {
      const user = JSON.parse(oldUser);
      const users = [user];

      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      await AsyncStorage.removeItem(LEGACY_USER_KEY);

      return users;
    }

    return [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function saveUser(user) {
  try {
    const users = await getUsers();

    const email = user.email.trim().toLowerCase();

    const existingIndex = users.findIndex(
      (item) => item.email.toLowerCase() === email
    );

    const normalizedUser = {
      ...user,
      email,
    };

    if (existingIndex !== -1) {
      users[existingIndex] = normalizedUser;
    } else {
      users.push(normalizedUser);
    }

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

export async function findUserByEmail(email) {
  const users = await getUsers();

  const normalizedEmail = email.trim().toLowerCase();

  return users.find(
    (user) => user.email.toLowerCase() === normalizedEmail
  ) || null;
}

export async function authenticateUser(email, password) {
  const user = await findUserByEmail(email);

  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export async function getUser() {
  const users = await getUsers();
  return users.length > 0 ? users[users.length - 1] : null;
}

export async function removeUser(email) {
  try {
    if (!email) {
      await AsyncStorage.removeItem(USERS_KEY);
      await AsyncStorage.removeItem(LEGACY_USER_KEY);
      return true;
    }

    const users = await getUsers();

    const updatedUsers = users.filter(
      (user) => user.email.toLowerCase() !== email.trim().toLowerCase()
    );

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
}
