import { Stack } from "expo-router";

import { ThemeProvider } from "../theme/ThemeContext";

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  );
}