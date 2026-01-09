// src/App.tsx
import { MainLayout } from "./layout/MainLayout";
import { CorridorView } from "./features/corridor/CorridorView";

export default function App() {
  return (
    <MainLayout>
      <CorridorView />
    </MainLayout>
  );
}
