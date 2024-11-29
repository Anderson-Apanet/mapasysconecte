export default function Footer() {
  return (
    <footer className="w-full bg-white shadow mt-auto">
      <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            2024 MapaSys. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
              Privacidade
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
              Termos
            </a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
              Contato
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
