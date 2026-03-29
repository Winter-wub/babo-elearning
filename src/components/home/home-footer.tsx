export function HomeFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} E-Learning Platform. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
