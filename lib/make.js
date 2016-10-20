'use babel';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import voucher from 'voucher';
import { EventEmitter } from 'events';

export const config = {
  ip_address: {
    title: 'Target IP address',
    description: 'IP address of target',
    type: 'string',
    default: "192.168.0.90",
    order: 1
  },
  ftp_user: {
    title: 'Target FTP user',
    description: 'User name to login to FTP on target',
    type: 'string',
    default: "root",
    order: 2
  },
  ftp_password: {
    title: 'Target FTP password',
    description: 'Password to login to FTP on target',
    type: 'string',
    default: "",
    order: 3
  }
};

export function provideBuilder() {
  const gccErrorMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(fatal error|error):\\s*(?<message>.+)';
  const errorMatch = [
    gccErrorMatch
  ];

  const gccWarningMatch = '(?<file>([A-Za-z]:[\\/])?[^:\\n]+):(?<line>\\d+):(?<col>\\d+):\\s*(warning):\\s*(?<message>.+)';
  const warningMatch = [
    gccWarningMatch
  ];

  return class MakeBuildProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      atom.config.observe('build-lfp.ip_address', () => this.emit('refresh'));
      atom.config.observe('build-lfp.ftp_user', () => this.emit('refresh'));
      atom.config.observe('build-lfp.ftp_password', () => this.emit('refresh'));
    }

    getNiceName() {
      return 'Build LFP';
    }

    isEligible() {
      this.files = [ 'Makefile', 'GNUmakefile', 'makefile' ]
        .map(f => path.join(this.cwd, f))
        .filter(fs.existsSync);
      return this.files.length > 0;
    }

    settings() {
      const target_make_make_install = {
        exec: 'function find_axis_root() { while [[ $PWD != \'/\' && ! -f "init_env" ]]; do cd ..; done; }; function change_directory () { cd $1; }; start_direcory=$(pwd); echo source folder: $(pwd); find_axis_root; if [ -f "init_env" ]; then echo top folder: $(pwd); source ./init_env; change_directory $start_direcory; echo source folder: $(pwd); make; make install; else echo Error: current directory is not a subdiretory of AXIS_TOP_DIR; fi',
        name: 'LFP - make/make install',
        sh: true,
        cwd: this.cwd,
        atomCommandName: 'build-lfp:make',
        errorMatch: errorMatch,
        warningMatch: warningMatch
      };

      const target_make_images = {
        exec: 'function find_axis_root() { while [[ $PWD != \'/\' && ! -f "init_env" ]]; do cd ..; done; }; function change_directory () { cd $1; }; start_direcory=$(pwd); echo source folder: $(pwd); find_axis_root; if [ -f "init_env" ]; then echo top folder: $(pwd); source ./init_env; make images; else echo Error: current directory is not a subdiretory of AXIS_TOP_DIR; fi',
        name: 'LFP - make images',
        sh: true,
        cwd: this.cwd,
        atomCommandName: 'build-lfp:make-images',
        errorMatch: errorMatch,
        warningMatch: warningMatch
      };

      const target_ftp = {
        exec: 'function find_axis_root() { while [[ $PWD != \'/\' && ! -f "init_env" ]]; do cd ..; done; }; function change_directory () { cd $1; }; start_direcory=$(pwd); echo source folder: $(pwd); find_axis_root; if [ -f "init_env" ]; then echo top folder: $(pwd); echo executing ftp -nv ' + atom.config.get('build-lfp.ip_address') + ' user: ' + atom.config.get('build-lfp.ftp_user') + '/' + atom.config.get('build-lfp.ftp_password') + ' command: put fimage flash; echo -e "user ' + atom.config.get('build-lfp.ftp_user') + ' ' + atom.config.get('build-lfp.ftp_password') + '\nput fimage flash\nexit" | ftp -nv ' + atom.config.get('build-lfp.ip_address') + '; else echo Error: current directory is not a subdiretory of AXIS_TOP_DIR; fi',
        name: 'LFP - FTP image to target',
        sh: true,
        cwd: this.cwd,
        atomCommandName: 'build-lfp:ftp',
        functionMatch: function (output) {
          const error = /^.*(Login incorrect|Can't connect to|Not connected|Can't open `fimage'|Error).*$/;
          const array = [];
          output.split(/\r?\n/).forEach(line => {
            const error_match = error.exec(line);
            if (error_match) {
              array.push({
                message: error_match[0]
              });
            }
          });
          return array;
        }
      };

      return [target_make_make_install, target_make_images, target_ftp];
    }
  };
}
