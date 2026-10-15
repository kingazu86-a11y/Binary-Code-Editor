import path from 'path';
import fs from 'fs-extra';

export interface CppLibrary {
  id: string;
  name: string;
  version: string;
  category: 'graphics' | 'utility' | 'game' | 'math' | 'vision';
  description: string;
  headerOnly: boolean;
  bundledOffline: boolean;
  headerInclude: string;
  cmakeSnippet: string;
  sampleCode: string;
  website: string;
}

export const CURATED_CPP_LIBRARIES: CppLibrary[] = [
  {
    id: 'nlohmann-json',
    name: 'nlohmann/json',
    version: '3.11.3',
    category: 'utility',
    description: 'JSON for Modern C++ — intuitive syntax and first-class C++ standard library integration.',
    headerOnly: true,
    bundledOffline: true,
    headerInclude: '#include <nlohmann/json.hpp>',
    cmakeSnippet: 'find_package(nlohmann_json 3.2.0 REQUIRED)\ntarget_link_libraries(${PROJECT_NAME} PRIVATE nlohmann_json::nlohmann_json)',
    sampleCode: `#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

int main() {
    json data = {
        {"ide", "Binary Code Editor"},
        {"offline_toolchain", true},
        {"features", {"Monaco", "GDB", "Clangd", "CMake", "Ninja"}}
    };
    std::cout << data.dump(4) << std::endl;
    return 0;
}`,
    website: 'https://github.com/nlohmann/json',
  },
  {
    id: 'raylib',
    name: 'raylib',
    version: '5.0',
    category: 'game',
    description: 'Simple and easy-to-use library to enjoy videogames programming.',
    headerOnly: false,
    bundledOffline: false,
    headerInclude: '#include "raylib.h"',
    cmakeSnippet: `find_package(raylib REQUIRED)
target_link_libraries(\${PROJECT_NAME} PRIVATE raylib opengl32 gdi32 winmm)`,
    sampleCode: `#include "raylib.h"

int main() {
    InitWindow(800, 450, "Binary IDE — raylib Demo");
    SetTargetFPS(60);
    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(RAYWHITE);
        DrawText("Hello from Binary IDE & raylib!", 190, 200, 24, LIGHTGRAY);
        EndDrawing();
    }
    CloseWindow();
    return 0;
}`,
    website: 'https://www.raylib.com/',
  },
  {
    id: 'sdl2',
    name: 'SDL2',
    version: '2.30.0',
    category: 'graphics',
    description: 'Cross-platform development library designed to provide low-level access to audio, keyboard, mouse, and graphics hardware.',
    headerOnly: false,
    bundledOffline: false,
    headerInclude: '#include <SDL2/SDL.h>',
    cmakeSnippet: `find_package(SDL2 REQUIRED)
target_link_libraries(\${PROJECT_NAME} PRIVATE SDL2::SDL2 SDL2::SDL2main)`,
    sampleCode: `#include <SDL2/SDL.h>
#include <iostream>

int main(int argc, char* argv[]) {
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        std::cerr << "SDL could not initialize! SDL_Error: " << SDL_GetError() << std::endl;
        return 1;
    }
    SDL_Window* window = SDL_CreateWindow("Binary IDE — SDL2 Window", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, 640, 480, SDL_WINDOW_SHOWN);
    if (!window) return 1;
    SDL_Delay(2000);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}`,
    website: 'https://www.libsdl.org/',
  },
  {
    id: 'sfml',
    name: 'SFML',
    version: '2.6.1',
    category: 'graphics',
    description: 'Simple and Fast Multimedia Library providing a simple interface to the various computer components.',
    headerOnly: false,
    bundledOffline: false,
    headerInclude: '#include <SFML/Graphics.hpp>',
    cmakeSnippet: `find_package(SFML 2.5 COMPONENTS graphics window system REQUIRED)
target_link_libraries(\${PROJECT_NAME} PRIVATE sfml-graphics sfml-window sfml-system)`,
    sampleCode: `#include <SFML/Graphics.hpp>

int main() {
    sf::RenderWindow window(sf::VideoMode(640, 480), "Binary IDE — SFML");
    sf::CircleShape shape(100.f);
    shape.setFillColor(sf::Color::Cyan);

    while (window.isOpen()) {
        sf::Event event;
        while (window.pollEvent(event)) {
            if (event.type == sf::Event::Closed) window.close();
        }
        window.clear();
        window.draw(shape);
        window.display();
    }
    return 0;
}`,
    website: 'https://www.sfml-dev.org/',
  },
  {
    id: 'boost',
    name: 'Boost',
    version: '1.84.0',
    category: 'utility',
    description: 'Peer-reviewed portable C++ source libraries covering algorithms, data structures, and multithreading.',
    headerOnly: false,
    bundledOffline: false,
    headerInclude: '#include <boost/algorithm/string.hpp>',
    cmakeSnippet: `find_package(Boost REQUIRED)
target_include_directories(\${PROJECT_NAME} PRIVATE \${Boost_INCLUDE_DIRS})`,
    sampleCode: `#include <iostream>
#include <string>
#include <boost/algorithm/string.hpp>

int main() {
    std::string str = "hello binary ide";
    boost::to_upper(str);
    std::cout << "Upper: " << str << std::endl;
    return 0;
}`,
    website: 'https://www.boost.org/',
  },
  {
    id: 'opencv',
    name: 'OpenCV',
    version: '4.9.0',
    category: 'vision',
    description: 'Open Source Computer Vision and Machine Learning Software Library.',
    headerOnly: false,
    bundledOffline: false,
    headerInclude: '#include <opencv2/opencv.hpp>',
    cmakeSnippet: `find_package(OpenCV REQUIRED)
target_link_libraries(\${PROJECT_NAME} PRIVATE \${OpenCV_LIBS})`,
    sampleCode: `#include <opencv2/opencv.hpp>
#include <iostream>

int main() {
    cv::Mat image = cv::Mat::zeros(300, 400, CV_8UC3);
    cv::putText(image, "Binary IDE + OpenCV", cv::Point(30, 150), cv::FONT_HERSHEY_SIMPLEX, 0.8, cv::Scalar(0, 255, 128), 2);
    cv::imshow("OpenCV Demo", image);
    cv::waitKey(2000);
    return 0;
}`,
    website: 'https://opencv.org/',
  },
];

export class CppLibraryService {
  getCatalog(): CppLibrary[] {
    return CURATED_CPP_LIBRARIES;
  }

  async getProjectLibraries(workspaceDir: string): Promise<string[]> {
    if (!workspaceDir) return [];
    const metaFile = path.join(workspaceDir, '.binary', 'libraries.json');
    if (await fs.pathExists(metaFile)) {
      try {
        const data = await fs.readJson(metaFile);
        return Array.isArray(data.libraries) ? data.libraries : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async addLibraryToProject(workspaceDir: string, libraryId: string): Promise<{ success: boolean; message: string }> {
    const lib = CURATED_CPP_LIBRARIES.find((l) => l.id === libraryId);
    if (!lib) {
      return { success: false, message: `Library ${libraryId} not found in catalog.` };
    }

    const metaDir = path.join(workspaceDir, '.binary');
    await fs.ensureDir(metaDir);
    const metaFile = path.join(metaDir, 'libraries.json');

    const currentLibs = await this.getProjectLibraries(workspaceDir);
    if (!currentLibs.includes(libraryId)) {
      currentLibs.push(libraryId);
      await fs.writeJson(metaFile, { libraries: currentLibs }, { spaces: 2 });
    }

    // If CMakeLists.txt exists, append dependency comment and hints
    const cmakeFile = path.join(workspaceDir, 'CMakeLists.txt');
    if (await fs.pathExists(cmakeFile)) {
      let content = await fs.readFile(cmakeFile, 'utf-8');
      if (!content.includes(lib.name)) {
        content += `\n# --- Dependency: ${lib.name} ---\n# ${lib.cmakeSnippet.replace(/\n/g, '\n# ')}\n`;
        await fs.writeFile(cmakeFile, content);
      }
    }

    return {
      success: true,
      message: `${lib.name} added to project! Include with: ${lib.headerInclude}`,
    };
  }
}

export const cppLibraryService = new CppLibraryService();
