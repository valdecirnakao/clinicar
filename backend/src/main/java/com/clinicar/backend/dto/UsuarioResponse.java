package com.clinicar.backend.dto;

import java.time.LocalDate;

public class UsuarioResponse {

    private Long id;
    private String nome;
    private String nome_social;
    private String email;
    private String cpf;
    private LocalDate nascimento;
    private String telefone;
    private String cep;
    private String logradouro;
    private String bairro;
    private String cidade;
    private String estado;
    private String complemento_endereco;
    private String numero_endereco;
    private String tipo_do_acesso;
    private String status;

    private Boolean mfaAtivo;
    private String mfaTipo;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getNome_social() {
        return nome_social;
    }

    public void setNome_social(String nome_social) {
        this.nome_social = nome_social;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public LocalDate getNascimento() {
        return nascimento;
    }

    public void setNascimento(LocalDate nascimento) {
        this.nascimento = nascimento;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getLogradouro() {
        return logradouro;
    }

    public void setLogradouro(String logradouro) {
        this.logradouro = logradouro;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getComplemento_endereco() {
        return complemento_endereco;
    }

    public void setComplemento_endereco(String complemento_endereco) {
        this.complemento_endereco = complemento_endereco;
    }

    public String getNumero_endereco() {
        return numero_endereco;
    }

    public void setNumero_endereco(String numero_endereco) {
        this.numero_endereco = numero_endereco;
    }

    public String getTipo_do_acesso() {
        return tipo_do_acesso;
    }

    public void setTipo_do_acesso(String tipo_do_acesso) {
        this.tipo_do_acesso = tipo_do_acesso;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getMfaAtivo() {
        return mfaAtivo;
    }

    public void setMfaAtivo(Boolean mfaAtivo) {
        this.mfaAtivo = mfaAtivo;
    }

    public String getMfaTipo() {
        return mfaTipo;
    }

    public void setMfaTipo(String mfaTipo) {
        this.mfaTipo = mfaTipo;
    }
}