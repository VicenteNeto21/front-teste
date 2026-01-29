using BackendApi.Enums;

namespace BackendApi.Dto.MovimentacaoDTO
{
    public class MovimentacaoResponseDTO
    {
        public int Id { get; set; }
        public TipoMovimentoMelEnum Tipo { get; set; }
        public decimal QuantidadeKg { get; set; }
        public decimal Valor { get; set; }
        public DateOnly Data { get; set; }
        public string? Motivo { get; set; }
        public string? Observacao { get; set; }
    }
}
